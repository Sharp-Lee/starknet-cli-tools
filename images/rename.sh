counter=1
for file in *.jpg; do
    mv "$file" "$counter.jpg"
    counter=$((counter + 1))
done

